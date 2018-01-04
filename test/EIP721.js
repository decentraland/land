/**
 * Ported over from zeppelin-solidity tests for NonFungibleToken.sol
 *
 * Given that the test is mostly for common functionality, it should work mostly as-is.
 *
 * Deleted functionality: `burn`
 */
import assertRevert from './helpers/assertRevert';
const BigNumber = web3.BigNumber;
const NonFungibleToken = artifacts.require('BasicNFT');

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('NonFungibleToken', accounts => {
  let token = null;
  const _name = 'Non Fungible Token';
  const _symbol = 'NFT';
  const _firstTokenId = 1;
  const _secondTokenId = 2;
  const _unknownTokenId = 3;
  const _creator = accounts[0];

  beforeEach(async function () {
    token = await NonFungibleToken.new(_name, _symbol, { from: _creator });
    await token.mint(_creator, _firstTokenId, { from: _creator });
    await token.mint(_creator, _secondTokenId, { from: _creator });
  });

  describe('name', function () {
    it('has a name', async function () {
      const name = await token.name();
      name.should.be.equal(_name);
    });
  });

  describe('symbol', function () {
    it('has a symbol', async function () {
      const symbol = await token.symbol();
      symbol.should.be.equal(_symbol);
    });
  });

  describe('totalSupply', function () {
    it('has a total supply equivalent to the inital supply', async function () {
      const totalSupply = await token.totalSupply();
      totalSupply.should.be.bignumber.equal(2);
    });
  });

  describe('balanceOf', function () {
    describe('when the given address owns some tokens', function () {
      it('returns the amount of tokens owned by the given address', async function () {
        const balance = await token.balanceOf(_creator);
        balance.should.be.bignumber.equal(2);
      });
    });

    describe('when the given address owns some tokens', function () {
      it('returns 0', async function () {
        const balance = await token.balanceOf(accounts[1]);
        balance.should.be.bignumber.equal(0);
      });
    });
  });

  describe('ownerOf', function () {
    describe('when the given token ID was tracked by this token', function () {
      const tokenId = _firstTokenId;

      it('returns the owner of the given token ID', async function () {
        const owner = await token.ownerOf(tokenId);
        owner.should.be.equal(_creator);
      });
    });

    describe('when the given token ID was not tracked by this token', function () {
      const tokenId = _unknownTokenId;

      it('reverts', async function () {
        await assertRevert(token.ownerOf(tokenId));
      });
    });
  });

  describe('tokenOfOwnerByIndex', function () {
    describe('when the given address owns some tokens', function () {
      const owner = _creator;

      describe('when the given index is lower than the amount of tokens owned by the given address', function () {
        const index = 0;

        it('returns the token ID placed at the given index', async function () {
          const tokenId = await token.tokenOfOwnerByIndex(owner, index);
          tokenId.should.be.bignumber.equal(_firstTokenId);
        });
      });

      describe('when the index is greater than or equal to the total tokens owned by the given address', function () {
        const index = 2;

        it('reverts', async function () {
          await assertRevert(token.tokenOfOwnerByIndex(owner, index));
        });
      });
    });

    describe('when the given address does not own any token', function () {
      const owner = accounts[1];

      it('reverts', async function () {
        await assertRevert(token.tokenOfOwnerByIndex(owner, 0));
      });
    });
  });

  describe('mint', function () {
    describe('when the given token ID was not tracked by this contract', function () {
      const tokenId = _unknownTokenId;

      describe('when the given address is not the zero address', function () {
        const to = accounts[1];

        it('mints the given token ID to the given address', async function () {
          const previousBalance = await token.balanceOf(to);

          await token.mint(to, tokenId);

          const owner = await token.ownerOf(tokenId);
          owner.should.be.equal(to);

          const balance = await token.balanceOf(to);
          balance.should.be.bignumber.equal(previousBalance + 1);
        });

        it('adds that token to the token list of the owner', async function () {
          await token.mint(to, tokenId);

          const tokens = await token.tokensOf(to);
          tokens.length.should.be.equal(1);
          tokens[0].should.be.bignumber.equal(tokenId);

          const addedToken = await token.tokenOfOwnerByIndex(to, 0);
          addedToken.should.be.bignumber.equal(tokenId);
        });

        it('emits a transfer event', async function () {
          const { logs } = await token.mint(to, tokenId);

          logs.length.should.be.equal(1);
          logs[0].event.should.be.eq('Transfer');
          logs[0].args._from.should.be.equal('0x0000000000000000000000000000000000000000');
          logs[0].args._to.should.be.equal(to);
          logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
        });
      });

      describe('when the given address is the zero address', function () {
        const to = 0x0;

        it('reverts', async function () {
          await assertRevert(token.mint(to, tokenId));
        });
      });
    });

    describe('when the given token ID was already tracked by this contract', function () {
      const tokenId = _firstTokenId;

      it('reverts', async function () {
        await assertRevert(token.mint(accounts[1], tokenId));
      });
    });
  });

  describe('transfer', function () {
    describe('when the address to transfer the token to is not the zero address', function () {
      const to = accounts[1];

      describe('when the given token ID was tracked by this token', function () {
        const tokenId = _firstTokenId;

        describe('when the msg.sender is the owner of the given token ID', function () {
          const sender = _creator;

          it('transfers the ownership of the given token ID to the given address', async function () {
            await token.transfer(to, tokenId, { from: sender });

            const newOwner = await token.ownerOf(tokenId);
            newOwner.should.be.equal(to);
          });

          it('clears the approval for the token ID', async function () {
            await token.approve(accounts[2], tokenId, { from: sender });

            await token.transfer(to, tokenId, { from: sender });

            const approvedAccount = await token.approvedFor(tokenId);
            approvedAccount.should.be.equal('0x0000000000000000000000000000000000000000');
          });

          it('emits an approval and transfer events', async function () {
            const { logs } = await token.transfer(to, tokenId, { from: sender });

            logs.length.should.be.equal(2);

            logs[0].event.should.be.eq('Approval');
            logs[0].args._owner.should.be.equal(sender);
            logs[0].args._approved.should.be.equal('0x0000000000000000000000000000000000000000');
            logs[0].args._tokenId.should.be.bignumber.equal(tokenId);

            logs[1].event.should.be.eq('Transfer');
            logs[1].args._from.should.be.equal(sender);
            logs[1].args._to.should.be.equal(to);
            logs[1].args._tokenId.should.be.bignumber.equal(tokenId);
          });

          it('adjusts owners balances', async function () {
            const previousBalance = await token.balanceOf(sender);
            await token.transfer(to, tokenId, { from: sender });

            const newOwnerBalance = await token.balanceOf(to);
            newOwnerBalance.should.be.bignumber.equal(1);

            const previousOwnerBalance = await token.balanceOf(_creator);
            previousOwnerBalance.should.be.bignumber.equal(previousBalance - 1);
          });

          it('places the last token of the sender in the position of the transferred token', async function () {
            const firstTokenIndex = 0;
            const lastTokenIndex = await token.balanceOf(_creator) - 1;
            const lastToken = await token.tokenOfOwnerByIndex(_creator, lastTokenIndex);

            await token.transfer(to, tokenId, { from: sender });

            const swappedToken = await token.tokenOfOwnerByIndex(_creator, firstTokenIndex);
            swappedToken.should.be.bignumber.equal(lastToken);
            await assertRevert(token.tokenOfOwnerByIndex(_creator, lastTokenIndex));
          });

          it('adds the token to the tokens list of the new owner', async function () {
            await token.transfer(to, tokenId, { from: sender });

            const tokenIDs = await token.tokensOf(to);
            tokenIDs.length.should.be.equal(1);
            tokenIDs[0].should.be.bignumber.equal(tokenId);
          });
        });

        describe('when the msg.sender is not the owner of the given token ID', function () {
          const sender = accounts[2];

          it('reverts', async function () {
            await assertRevert(token.transfer(to, tokenId, { from: sender }));
          });
        });
      });

      describe('when the given token ID was not tracked by this token', function () {
        let tokenId = _unknownTokenId;

        it('reverts', async function () {
          await assertRevert(token.transfer(to, tokenId, { from: _creator }));
        });
      });
    });

    describe('when the address to transfer the token to is the zero address', function () {
      const to = 0x0;

      it('reverts', async function () {
        await assertRevert(token.transfer(to, 0, { from: _creator }));
      });
    });
  });

  describe('approve', function () {
    describe('when the given token ID was already tracked by this contract', function () {
      const tokenId = _firstTokenId;

      describe('when the sender owns the given token ID', function () {
        const sender = _creator;

        describe('when the address that receives the approval is the 0 address', function () {
          const to = '0x0000000000000000000000000000000000000000';

          describe('when there was no approval for the given token ID before', function () {
            it('clears the approval for that token', async function () {
              await token.approve(to, tokenId, { from: sender });

              const approvedAccount = await token.approvedFor(tokenId);
              approvedAccount.should.be.equal(to);
            });

            it('does not emit an approval event', async function () {
              const { logs } = await token.approve(to, tokenId, { from: sender });

              logs.length.should.be.equal(0);
            });
          });

          describe('when the given token ID was approved for another account', function () {
            beforeEach(async function () {
              await token.approve(accounts[2], tokenId, { from: sender });
            });

            it('clears the approval for the token ID', async function () {
              await token.approve(to, tokenId, { from: sender });

              const approvedAccount = await token.approvedFor(tokenId);
              approvedAccount.should.be.equal(to);
            });

            it('emits an approval event', async function () {
              const { logs } = await token.approve(to, tokenId, { from: sender });

              logs.length.should.be.equal(1);
              logs[0].event.should.be.eq('Approval');
              logs[0].args._owner.should.be.equal(sender);
              logs[0].args._approved.should.be.equal(to);
              logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
            });
          });
        });

        describe('when the address that receives the approval is not the 0 address', function () {
          describe('when the address that receives the approval is different than the owner', function () {
            const to = accounts[1];

            describe('when there was no approval for the given token ID before', function () {
              it('approves the token ID to the given address', async function () {
                await token.approve(to, tokenId, { from: sender });

                const approvedAccount = await token.approvedFor(tokenId);
                approvedAccount.should.be.equal(to);
              });

              it('emits an approval event', async function () {
                const { logs } = await token.approve(to, tokenId, { from: sender });

                logs.length.should.be.equal(1);
                logs[0].event.should.be.eq('Approval');
                logs[0].args._owner.should.be.equal(sender);
                logs[0].args._approved.should.be.equal(to);
                logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
              });
            });

            describe('when the given token ID was approved for the same account', function () {
              beforeEach(async function () {
                await token.approve(to, tokenId, { from: sender });
              });

              it('keeps the approval to the given address', async function () {
                await token.approve(to, tokenId, { from: sender });

                const approvedAccount = await token.approvedFor(tokenId);
                approvedAccount.should.be.equal(to);
              });

              it('emits an approval event', async function () {
                const { logs } = await token.approve(to, tokenId, { from: sender });

                logs.length.should.be.equal(1);
                logs[0].event.should.be.eq('Approval');
                logs[0].args._owner.should.be.equal(sender);
                logs[0].args._approved.should.be.equal(to);
                logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
              });
            });

            describe('when the given token ID was approved for another account', function () {
              beforeEach(async function () {
                await token.approve(accounts[2], tokenId, { from: sender });
              });

              it('changes the approval to the given address', async function () {
                await token.approve(to, tokenId, { from: sender });

                const approvedAccount = await token.approvedFor(tokenId);
                approvedAccount.should.be.equal(to);
              });

              it('emits an approval event', async function () {
                const { logs } = await token.approve(to, tokenId, { from: sender });

                logs.length.should.be.equal(1);
                logs[0].event.should.be.eq('Approval');
                logs[0].args._owner.should.be.equal(sender);
                logs[0].args._approved.should.be.equal(to);
                logs[0].args._tokenId.should.be.bignumber.equal(tokenId);
              });
            });
          });

          describe('when the address that receives the approval is the owner', function () {
            const to = _creator;

            describe('when there was no approval for the given token ID before', function () {
              it('reverts', async function () {
                await assertRevert(token.approve(to, tokenId, { from: sender }));
              });
            });

            describe('when the given token ID was approved for another account', function () {
              beforeEach(async function () {
                await token.approve(accounts[2], tokenId, { from: sender });
              });

              it('reverts', async function () {
                await assertRevert(token.approve(to, tokenId, { from: sender }));
              });
            });
          });
        });
      });

      describe('when the sender does not own the given token ID', function () {
        const sender = accounts[1];

        it('reverts', async function () {
          await assertRevert(token.approve(accounts[2], tokenId, { from: sender }));
        });
      });
    });

    describe('when the given token ID was not tracked by the contract before', function () {
      const tokenId = _unknownTokenId;

      it('reverts', async function () {
        await assertRevert(token.approve(accounts[1], tokenId, { from: _creator }));
      });
    });
  });

  describe('takeOwnership', function () {
    describe('when the given token ID was already tracked by this contract', function () {
      const tokenId = _firstTokenId;

      describe('when the sender has the approval for the token ID', function () {
        const sender = accounts[1];

        beforeEach(async function () {
          await token.approve(sender, tokenId, { from: _creator });
        });

        it('transfers the ownership of the given token ID to the given address', async function () {
          await token.takeOwnership(tokenId, { from: sender });

          const newOwner = await token.ownerOf(tokenId);
          newOwner.should.be.equal(sender);
        });

        it('clears the approval for the token ID', async function () {
          await token.takeOwnership(tokenId, { from: sender });

          const approvedAccount = await token.approvedFor(tokenId);
          approvedAccount.should.be.equal('0x0000000000000000000000000000000000000000');
        });

        it('emits an approval and transfer events', async function () {
          const { logs } = await token.takeOwnership(tokenId, { from: sender });

          logs.length.should.be.equal(2);

          logs[0].event.should.be.eq('Approval');
          logs[0].args._owner.should.be.equal(_creator);
          logs[0].args._approved.should.be.equal('0x0000000000000000000000000000000000000000');
          logs[0].args._tokenId.should.be.bignumber.equal(tokenId);

          logs[1].event.should.be.eq('Transfer');
          logs[1].args._from.should.be.equal(_creator);
          logs[1].args._to.should.be.equal(sender);
          logs[1].args._tokenId.should.be.bignumber.equal(tokenId);
        });

        it('adjusts owners balances', async function () {
          const previousBalance = await token.balanceOf(_creator);

          await token.takeOwnership(tokenId, { from: sender });

          const newOwnerBalance = await token.balanceOf(sender);
          newOwnerBalance.should.be.bignumber.equal(1);

          const previousOwnerBalance = await token.balanceOf(_creator);
          previousOwnerBalance.should.be.bignumber.equal(previousBalance - 1);
        });

        it('places the last token of the sender in the position of the transferred token', async function () {
          const firstTokenIndex = 0;
          const lastTokenIndex = await token.balanceOf(_creator) - 1;
          const lastToken = await token.tokenOfOwnerByIndex(_creator, lastTokenIndex);

          await token.takeOwnership(tokenId, { from: sender });

          const swappedToken = await token.tokenOfOwnerByIndex(_creator, firstTokenIndex);
          swappedToken.should.be.bignumber.equal(lastToken);
          await assertRevert(token.tokenOfOwnerByIndex(_creator, lastTokenIndex));
        });

        it('adds the token to the tokens list of the new owner', async function () {
          await token.takeOwnership(tokenId, { from: sender });

          const tokenIDs = await token.tokensOf(sender);
          tokenIDs.length.should.be.equal(1);
          tokenIDs[0].should.be.bignumber.equal(tokenId);
        });
      });

      describe('when the sender does not have the approval for the token ID', function () {
        const sender = accounts[1];

        it('reverts', async function () {
          await assertRevert(token.takeOwnership(tokenId, { from: sender }));
        });
      });

      describe('when the sender is already the owner of the token', function () {
        const sender = _creator;

        it('reverts', async function () {
          await assertRevert(token.takeOwnership(tokenId, { from: sender }));
        });
      });
    });

    describe('when the given token ID was not tracked by the contract before', function () {
      const tokenId = _unknownTokenId;

      it('reverts', async function () {
        await assertRevert(token.takeOwnership(tokenId, { from: _creator }));
      });
    });
  });
});
